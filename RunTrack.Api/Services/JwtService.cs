using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace RunTrack.Api.Services
{
    public class JwtOptions
    {
        /// <summary>Clave de firma HMAC. Debe tener al menos 32 caracteres y venir de una variable de entorno o de user-secrets.</summary>
        public string SecretKey { get; set; } = string.Empty;
        public string Issuer { get; set; } = "RunTrack.Api";
        public string Audience { get; set; } = "RunTrack.Clients";
        public int ExpirationHours { get; set; } = 12;

        public const int MinSecretLength = 32;
    }

    public class JwtService
    {
        private readonly JwtOptions _options;

        public JwtService(IOptions<JwtOptions> options)
        {
            _options = options.Value;
        }

        public string GenerateCoachToken(string username) =>
            GenerateToken(new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, username),
                new Claim(ClaimTypes.Role, "Coach"),
            });

        public string GenerateRunnerToken(int runnerId) =>
            GenerateToken(new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, $"runner:{runnerId}"),
                new Claim(ClaimTypes.Role, "Runner"),
                new Claim("runner_id", runnerId.ToString()),
            });

        private string GenerateToken(IEnumerable<Claim> claims)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SecretKey));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _options.Issuer,
                audience: _options.Audience,
                claims: claims.Append(new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())),
                expires: DateTime.UtcNow.AddHours(_options.ExpirationHours),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
