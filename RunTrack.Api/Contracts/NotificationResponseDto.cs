namespace RunTrack.Api.Contracts
{
    public class NotificationResponseDto
    {
        public int Id { get; set; }
        public DateTime CreatedAtUtc { get; set; }

        public int? RunnerId { get; set; }
        public string? RunnerName { get; set; }

        public string Type { get; set; } = null!;
        public string Title { get; set; } = null!;
        public string Message { get; set; } = null!;

        public bool IsRead { get; set; }
        public DateTime? ReadAtUtc { get; set; }

        public int? TrainingEventId { get; set; }
        public int? PlannedWorkoutId { get; set; }
    }
}
