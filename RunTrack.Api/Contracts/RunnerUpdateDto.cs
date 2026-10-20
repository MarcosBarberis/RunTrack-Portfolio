namespace RunTrack.Api.Contracts
{
    public class RunnerUpdateDto
    {
        public string FullName { get; set; } = "";
        public int Age { get; set; }
        public string? Goal { get; set; }
        public int CategoryId { get; set; }
        public string Dni { get; set; }
        public DateTime? BirthDate { get; set; }
    }
}