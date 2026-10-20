namespace RunTrack.Api.Contracts
{
    public class NotificationCreateDto
    {
        public int? RunnerId { get; set; }
        public string Type { get; set; } = null!;
        public string Title { get; set; } = null!;
        public string Message { get; set; } = null!;
        public int? TrainingEventId { get; set; }
        public int? PlannedWorkoutId { get; set; }
    }
}
