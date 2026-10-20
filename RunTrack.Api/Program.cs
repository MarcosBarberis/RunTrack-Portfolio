using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using RunTrack.Api.Auth;
using RunTrack.Api.Data;
using RunTrack.Api.Serialization;
using RunTrack.Api.Services;

namespace RunTrack.Api
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);
            var config = builder.Configuration;

            // ---------- Configuración obligatoria ----------
            var jwt = config.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
            if (string.IsNullOrWhiteSpace(jwt.SecretKey) || jwt.SecretKey.Length < JwtOptions.MinSecretLength)
                throw new InvalidOperationException(
                    $"Jwt:SecretKey no está configurada o tiene menos de {JwtOptions.MinSecretLength} caracteres. " +
                    "Definila con la variable de entorno Jwt__SecretKey o con dotnet user-secrets.");

            // ---------- Servicios ----------
            builder.Services.AddControllers()
                .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new DateOnlyJsonConverter()));

            builder.Services.AddDbContext<RunTrackDbContext>(options =>
                options.UseSqlServer(
                    config.GetConnectionString("DefaultConnection"),
                    sql => sql.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null)));

            builder.Services.Configure<CoachAuthOptions>(config.GetSection("CoachAuth"));
            builder.Services.Configure<JwtOptions>(config.GetSection("Jwt"));
            builder.Services.AddScoped<JwtService>();
            builder.Services.AddScoped<StreakService>();
            builder.Services.AddScoped<IRunnerActionsPolicy, RunnerActionsPolicy>();

            // ---------- Autenticación JWT ----------
            builder.Services
                .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = jwt.Issuer,
                        ValidAudience = jwt.Audience,
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SecretKey)),
                        ClockSkew = TimeSpan.FromMinutes(1),
                    };

                    // Un runner dado de baja pierde el acceso aunque su token siga vigente.
                    options.Events = new JwtBearerEvents
                    {
                        OnTokenValidated = async ctx =>
                        {
                            var principal = ctx.Principal;
                            if (principal is null || !principal.IsInRole("Runner")) return;

                            var runnerId = principal.GetRunnerId();
                            if (runnerId is null)
                            {
                                ctx.Fail("Token de runner sin runner_id.");
                                return;
                            }

                            var db = ctx.HttpContext.RequestServices.GetRequiredService<RunTrackDbContext>();
                            var active = await db.Runners.AsNoTracking()
                                .Where(r => r.Id == runnerId.Value)
                                .Select(r => (bool?)r.IsActive)
                                .FirstOrDefaultAsync();

                            if (active != true)
                                ctx.Fail("RUNNER_INACTIVE");
                        }
                    };
                });

            builder.Services.AddAuthorization(options =>
            {
                options.AddPolicy("CoachOnly", p => p.RequireRole("Coach"));
                options.AddPolicy("RunnerOnly", p => p.RequireRole("Runner"));

                // Todo endpoint requiere usuario autenticado salvo que se marque [AllowAnonymous].
                options.FallbackPolicy = new AuthorizationPolicyBuilder()
                    .RequireAuthenticatedUser()
                    .Build();
            });

            builder.Services.AddAuthRateLimiting();

            // ---------- CORS: solo los orígenes configurados ----------
            var allowedOrigins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
            builder.Services.AddCors(options =>
                options.AddPolicy("Frontend", policy =>
                    policy.WithOrigins(allowedOrigins)
                          .AllowAnyHeader()
                          .AllowAnyMethod()));

            builder.Services.Configure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
                options.KnownNetworks.Clear();
                options.KnownProxies.Clear();
            });

            // ---------- Swagger ----------
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(options =>
            {
                options.SwaggerDoc("v1", new OpenApiInfo { Title = "RunTrack API", Version = "v1" });

                var bearer = new OpenApiSecurityScheme
                {
                    Description = "Token JWT obtenido en /api/auth/coach-login o /api/auth/runner-login.",
                    Name = "Authorization",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" },
                };
                options.AddSecurityDefinition("Bearer", bearer);
                options.AddSecurityRequirement(new OpenApiSecurityRequirement { { bearer, new List<string>() } });
            });

            // ---------- Pipeline ----------
            var app = builder.Build();

            app.UseForwardedHeaders();

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseHsts();
            }

            app.UseHttpsRedirection();
            app.UseRouting();
            app.UseCors("Frontend");
            app.UseRateLimiter();
            app.UseAuthentication();
            app.UseAuthorization();
            app.MapControllers();
            app.Run();
        }
    }
}
