namespace RunTrack.Api.Models;

public enum FeeStatus
{
    UpToDate = 0,
    DueSoon = 1,
    Overdue = 2,
    NotPaidYet = 3
}

public enum DocStatus
{
    Pending = 0,
    Valid = 1,
    Expired = 2
}

public class MyMembershipStatusDto
{
    public FeeStatus FeeStatus { get; set; }
    public DateTime? LastPaymentDate { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime? HardBlockDate { get; set; }
    public bool PlanVisible { get; set; }

    public DocStatus WaiverStatus { get; set; }

    public DocStatus EmacStatus { get; set; }
    public DateTime? EmacValidUntil { get; set; }

    public bool TermsAccepted { get; set; }
    public string? TermsVersion { get; set; }
}
