namespace RunTrack.Api.Domain.Entities
{
    public class Attendance
    {
        public int Id { get; set; }

        public int TrainingEventId { get; set; }
        public TrainingEvent TrainingEvent { get; set; } = null!;

        public int RunnerId { get; set; }
        public Runner Runner { get; set; } = null!;

        public AttendanceStatus Status { get; set; } = AttendanceStatus.Unknown;

        public DateTime SubmittedAtUtc { get; set; }
        public DateTime? UpdatedAtUtc { get; set; }
        public int EditCount { get; set; } = 0;
    }

    public enum AttendanceStatus
    {
        Unknown = 0,
        Confirmed = 1,
        Attended = 2,
        NoShow = 3,
        Solo = 4
    }
}
