namespace RunTrack.Api.Domain.Entities
{
    public class Category
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;   // Inicial, Intermedio, etc.
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
