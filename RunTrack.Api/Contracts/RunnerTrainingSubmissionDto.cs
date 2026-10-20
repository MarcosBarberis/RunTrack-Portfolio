namespace RunTrack.Api.Contracts
{
    public class RunnerTrainingSubmissionDto
    {
        public int Status { get; set; }
        public string? Note { get; set; }

        public decimal DistanceKm { get; set; }
        public decimal DurationMin { get; set; }
        public int Rpe { get; set; }
        public bool HadPain { get; set; }
        public string? Notes { get; set; }
    }
}