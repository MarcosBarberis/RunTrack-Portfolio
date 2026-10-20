namespace RunTrack.Api.Models;

public class RunnerBillingDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string? Dni { get; set; }

    public FeeStatus FeeStatus { get; set; }
    public DateTime? LastPaymentDate { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime? HardBlockDate { get; set; }
    public bool PlanVisible { get; set; }
}
