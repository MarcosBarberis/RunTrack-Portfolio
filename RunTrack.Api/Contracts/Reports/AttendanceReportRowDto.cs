namespace RunTrack.Api.Contracts.Reports
{
    public class AttendanceReportRowDto
    {
        public int AttendanceId { get; set; }

        public int TrainingEventId { get; set; }
        public DateOnly EventDate { get; set; }
        public TimeOnly EventTime { get; set; }
        public string EventTitle { get; set; } = null!;
        public string? Location { get; set; }

        public int RunnerId { get; set; }
        public string RunnerName { get; set; } = null!;
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = null!;

        public int Status { get; set; }
        public string StatusText { get; set; } = null!;
    }
}
