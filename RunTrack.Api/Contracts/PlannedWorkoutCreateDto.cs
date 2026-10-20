namespace RunTrack.Api.Contracts
{
    public class PlannedWorkoutCreateDto
    {
        public DateOnly Date { get; set; }
        public string Type { get; set; } = null!;
        public string? Notes { get; set; }

        public decimal? TargetDistanceKm { get; set; }
        public decimal? TargetDurationMin { get; set; }

        public int? CategoryId { get; set; }
        public int? RunnerId { get; set; }
    }
}
