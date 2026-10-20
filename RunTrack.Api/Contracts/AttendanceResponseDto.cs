namespace RunTrack.Api.Contracts
{
    public class AttendanceResponseDto
    {
        public int Id { get; set; }
        public int TrainingEventId { get; set; }

        public int RunnerId { get; set; }
        public string RunnerName { get; set; } = null!;

        public int Status { get; set; }
        public string StatusText { get; set; } = null!;

       
    }
}
