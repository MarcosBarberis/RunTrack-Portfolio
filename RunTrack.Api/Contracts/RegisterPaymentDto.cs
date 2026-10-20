namespace RunTrack.Api.Models;

public class RegisterPaymentDto
{
    public DateTime? PaidAt { get; set; }  // si viene null => hoy
    public int? Months { get; set; }       // opcional: 1 (default), 2, 3...
}
