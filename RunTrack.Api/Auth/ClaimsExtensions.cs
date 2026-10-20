using System.Security.Claims;

namespace RunTrack.Api.Auth
{
    public static class ClaimsExtensions
    {
        public static int? GetRunnerId(this ClaimsPrincipal user)
        {
            var value = user.FindFirst("runner_id")?.Value;
            return int.TryParse(value, out var id) ? id : null;
        }

        public static bool IsCoach(this ClaimsPrincipal user) =>
            user.IsInRole("Coach");

        public static bool IsRunner(this ClaimsPrincipal user) =>
            user.IsInRole("Runner");
    }
}
