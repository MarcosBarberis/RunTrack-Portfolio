namespace RunTrack.Api.Contracts
{
        public class TrainingEventUpsertDto
        {
            public DateOnly Date { get; set; }
            public TimeOnly Time { get; set; }
            public string? Title { get; set; }
            public string? Location { get; set; }
            public string? Notes { get; set; }
            public int? CategoryId { get; set; }
        }
}

