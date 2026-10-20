namespace RunTrack.Api.Contracts.Reports

{

    public class WorkoutLogReportRowDto
    {

        public int WorkoutLogId { get ; set; }
        public DateOnly Date { get; set; }

        public int RunnerId { get; set; }
        public string RunnerName { get; set; } = null!;
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = null!;

        public decimal DistanceKm { get; set; }
        public decimal DurationMin { get; set; }
        public decimal PaceMinPerKm { get; set; }

        public int Rpe { get; set; }
        public bool HadPain { get; set; }
        public string? Notes { get; set; }

    }

}
