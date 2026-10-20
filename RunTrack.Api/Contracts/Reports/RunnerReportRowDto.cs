namespace RunTrack.Api.Contracts.Reports
{
    public class RunnerReportRowDto
    {
        public int RunnerId { get; set; }
        public string FullName { get; set; } = null!;
        public int Age { get; set; }
        public string? Goal { get; set; }

        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = null!;
    }
}
