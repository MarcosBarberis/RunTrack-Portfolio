namespace RunTrack.Api.Contracts
{
    public class WeeklyAttendanceSummaryDto
    {
        public DateOnly WeekStart { get; set; }
        public DateOnly WeekEnd { get; set; }

        public int Events { get; set; }
        public int TotalRecords { get; set; }  // registros de asistencia (no personas totales)

        public int Confirmed { get; set; }
        public int Attended { get; set; }
        public int NoShow { get; set; }
        public int Solo { get; set; }
        public int Unknown { get; set; }

        public decimal AttendanceRate { get; set; } // Attended / Confirmed (0..1)
    }
}
