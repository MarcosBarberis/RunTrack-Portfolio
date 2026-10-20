namespace RunTrack.Api.Contracts
{
    public class WorkoutLogResponseDto
    {
        public int Id { get; set; }
        public DateOnly Date { get; set; }

        public int RunnerId { get; set; }
        public string RunnerName { get; set; } = null!;

        public int? PlannedWorkoutId { get; set; }
        public string? PlannedType { get; set; }

        public decimal DistanceKm { get; set; }
        public decimal DurationMin { get; set; }

        public decimal PaceMinPerKm { get; set; } // calculado
        public int Rpe { get; set; }
        public bool HadPain { get; set; }
        public string? Notes { get; set; }

        public bool IsSelfRegistered { get; set; }
        public string? SelfRegisteredTitle { get; set; }
    }
}
