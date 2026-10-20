namespace RunTrack.Api.Models;

public class UpdateRunnerDocumentsDto
{
    public DateTime? WaiverDeliveredAt { get; set; }   // Deslinde (sin vencimiento)
    public DateTime? EmacDeliveredAt { get; set; }     // EMAC entregado
}
