namespace RunTrack.Api.Contracts
{
    public class AttendanceRankingItemDto
    {
        public int RunnerId { get; set; }
        public string RunnerName { get; set; } = null!;

        public int Confirmed { get; set; }
        public int Attended { get; set; }
        public int NoShow { get; set; }
        public int Solo { get; set; }

        public decimal AttendanceRate { get; set; } // Attended / Confirmed (0..1)
    }
}
