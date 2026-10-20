namespace RunTrack.Api.Contracts
{
    public class RunnerKpiSummaryDto
    {
        public int RunnerId { get; set; }
        public string RunnerName { get; set; } = null!;

        public DateOnly From { get; set; }
        public DateOnly To { get; set; }

        public int Sessions { get; set; }
        public decimal TotalKm { get; set; }
        public decimal TotalMinutes { get; set; }

        public decimal AvgPaceMinPerKm { get; set; }   // promedio ponderado
        public decimal PainRate { get; set; }          // 0..1
        public decimal AvgRpe { get; set; }            // 1..5
    }
}
