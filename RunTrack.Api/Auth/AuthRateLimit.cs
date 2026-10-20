using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace RunTrack.Api.Auth
{
    /// <summary>
    /// Limita los intentos de login por IP para frenar ataques de fuerza bruta
    /// (por ejemplo, probar DNIs consecutivos).
    /// </summary>
    public static class AuthRateLimit
    {
        public const string PolicyName = "auth";

        public static IServiceCollection AddAuthRateLimiting(this IServiceCollection services) =>
            services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
                options.AddPolicy(PolicyName, http =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 10,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0,
                        }));
            });
    }
}
