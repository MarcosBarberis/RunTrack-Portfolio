namespace RunTrack.Api.Contracts
{
    public class AttendanceUpsertDto
    {
        public int TrainingEventId { get; set; }
        public int RunnerId { get; set; }

        public int Status { get; set; } // 0..4 (AttendanceStatus)
      
    }
}
