namespace RunTrack.Api.Contracts
{
    public class TrainingEventCreateDto
    {
        public DateOnly Date { get; set; }
        public TimeOnly Time { get; set; }

        public string Title { get; set; } = null!;
        public string? Location { get; set; }
        public string? Notes { get; set; }

        public int? CategoryId { get; set; }
    }
}
