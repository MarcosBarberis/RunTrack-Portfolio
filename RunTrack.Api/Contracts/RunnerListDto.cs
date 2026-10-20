namespace RunTrack.Api.Contracts
{
    public class RunnerListDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = "";
        public int Age { get; set; }
        public string? Goal { get; set; }
        public bool IsActive { get; set; }
        public string? Dni { get; set; }

        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = "";

        public DateTime? BirthDate { get; set; }
        public int CurrentStreak { get; set; }
        public int BestStreak { get; set; }
    }
}