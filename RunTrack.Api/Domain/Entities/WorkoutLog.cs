namespace RunTrack.Api.Domain.Entities
{
    public class WorkoutLog
    {
        public int Id { get; set; }

        public DateOnly Date { get; set; }

        public int RunnerId { get; set; }
        public Runner Runner { get; set; } = null!;
        public int? TrainingEventId { get; set; }
        public TrainingEvent? TrainingEvent { get; set; }


        // Plan opcional (si registró sobre un plan)
        public int? PlannedWorkoutId { get; set; }
        public PlannedWorkout? PlannedWorkout { get; set; }

        public decimal DistanceKm { get; set; }
        public decimal DurationMin { get; set; }

        // RPE (percepción de esfuerzo) 1 a 5
        public int Rpe { get; set; }

        public bool HadPain { get; set; }             // dolor/molestia
        public string? Notes { get; set; }            // comentario libre
        public DateTime SubmittedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
        public int EditCount { get; set; } = 0;

        public bool IsSelfRegistered { get; set; } = false;
        public string? SelfRegisteredTitle { get; set; }
    }
}
