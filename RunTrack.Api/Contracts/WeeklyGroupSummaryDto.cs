namespace RunTrack.Api.Contracts
{
    public class WeeklyGroupSummaryDto
    {
        public DateOnly WeekStart { get; set; }  // lunes
        public DateOnly WeekEnd { get; set; }    // domingo

        public int Sessions { get; set; }
        public decimal TotalKm { get; set; }
        public int ActiveRunners { get; set; }

        public decimal AvgPaceMinPerKm { get; set; }
        public decimal PainRate { get; set; }
        public decimal AvgRpe { get; set; }
    }
}
