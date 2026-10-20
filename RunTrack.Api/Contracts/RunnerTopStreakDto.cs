namespace RunTrack.Api.Contracts
{
    public class RunnerTopStreakDto
    {
        public int RunnerId { get; set; }
        public string FullName { get; set; } = "";
        public int BestStreak { get; set; }
    }
}
