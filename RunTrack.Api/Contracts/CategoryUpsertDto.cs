namespace RunTrack.Api.Contracts
{
    public class CategoryUpsertDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true; // útil si hacés soft
    }
}
