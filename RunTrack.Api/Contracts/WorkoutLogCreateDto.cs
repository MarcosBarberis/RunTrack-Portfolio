namespace RunTrack.Api.Contracts
{
    public class WorkoutLogCreateDto
    {
        public DateOnly Date { get; set; }

        public int RunnerId { get; set; }
        public int? PlannedWorkoutId { get; set; }

        public decimal DistanceKm { get; set; }
        public int DurationMin { get; set; }

        public int Rpe { get; set; }     // 1..5
        public bool HadPain { get; set; }
        public string? Notes { get; set; }
    }
}
