namespace RunTrack.Api.Domain.Entities
{
    public class TrainingEvent
    {
        public int Id { get; set; }

        public DateOnly Date { get; set; }
        public TimeOnly Time { get; set; }

        public string Title { get; set; } = null!;      // “Fondo Parque”, “Series Pista”
        public string? Location { get; set; }           // “Parque Sarmiento”
        public string? Notes { get; set; }              // instrucciones del profe

        // Opcional: evento orientado a una categoría (si es para todos, null)
        public int? CategoryId { get; set; }
        public Category? Category { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
