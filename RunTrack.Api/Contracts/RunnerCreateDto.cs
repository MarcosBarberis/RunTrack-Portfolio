namespace RunTrack.Api.Contracts
{
    public record RunnerCreateDto(
       string FullName,
       int Age,
       string Goal,
       int CategoryId,
       string Dni
    );
  
} 
   
   


