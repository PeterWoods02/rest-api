import { Team, Player } from "../shared/types";

export const teams: Team[] = [
  {
    id: 1,
    teamName: "Dublin Dynamos",
    country: "Ireland",
    league: "League of Ireland Premier Division",
    location: "Dublin",
    founded: 1901,
    stadium: "Aviva Arena",
    titlesWon: 12,
    isActive: true,
    history: "Dublin Dynamos is a football team from Dublin. The team was founded in 1901. They have won 12 league titles. They are known for fast play and loyal fans."
  },
  {
    id: 2,
    teamName: "Cork Cavaliers",
    country: "Ireland",
    league: "League of Ireland Premier Division",
    location: "Cork",
    founded: 1920,
    stadium: "Rebel Park",
    titlesWon: 7,
    isActive: true,
    history: "Cork Cavaliers is a football team from Cork. The team started in 1920. They have won 7 league titles. They play at Rebel Park."
  },
  {
    id: 3,
    teamName: "Galway Gaels",
    country: "Ireland",
    league: "League of Ireland First Division",
    location: "Galway",
    founded: 1935,
    stadium: "Corrib Stadium",
    titlesWon: 3,
    isActive: true,
    history: "Galway Gaels is a football club from Galway. The team was founded in 1935. They have won 3 league titles. Their home stadium is Corrib Stadium."
  },
  {
    id: 4,
    teamName: "Limerick Legends",
    country: "Ireland",
    league: "League of Ireland First Division",
    location: "Limerick",
    founded: 1948,
    stadium: "Shannon Grounds",
    titlesWon: 5,
    isActive: false,
    history: "Limerick Legends was founded in 1948. They have won 5 league titles. They play in Shannon Grounds. The team is not active now."
  },
  {
    id: 5,
    teamName: "Belfast Titans",
    country: "Ireland",
    league: "League of Ireland Premier Division",
    location: "Belfast",
    founded: 1890,
    stadium: "Titan Park",
    titlesWon: 14,
    isActive: true,
    history: "Belfast Titans is a football team from Belfast. They started in 1890. They have won 14 league titles. Titan Park is their home."
  },
  {
    id: 6,
    teamName: "Waterford Waves",
    country: "Ireland",
    league: "League of Ireland First Division",
    location: "Waterford",
    founded: 1955,
    stadium: "Crystal Stadium",
    titlesWon: 4,
    isActive: true,
    history: "Waterford Waves is a team from Waterford. They were founded in 1955. They have won 4 league titles. Their home stadium is Crystal Stadium."
  },
  {
    id: 7,
    teamName: "Kilkenny Kings",
    country: "Ireland",
    league: "League of Ireland Premier Division",
    location: "Kilkenny",
    founded: 1970,
    stadium: "Marble City Grounds",
    titlesWon: 2,
    isActive: false,
    history: "Kilkenny Kings is a football team from Kilkenny. The team was started in 1970. They have won 2 league titles. They are not active now."
  },
  {
    id: 8,
    teamName: "Sligo Storm",
    country: "Ireland",
    league: "League of Ireland First Division",
    location: "Sligo",
    founded: 1985,
    stadium: "Wild Atlantic Stadium",
    titlesWon: 1,
    isActive: true,
    history: "Sligo Storm is a football team from Sligo. They were founded in 1985. They have won 1 league title. Their home is Wild Atlantic Stadium."
  },
  {
    id: 9,
    teamName: "Mayo Mariners",
    country: "Ireland",
    league: "League of Ireland First Division",
    location: "Castlebar",
    founded: 1965,
    stadium: "Clew Bay Stadium",
    titlesWon: 3,
    isActive: false,
    history: "Mayo Mariners is a football team from Castlebar. The team started in 1965. They have won 3 league titles. They are not active now."
  },
  {
    id: 10,
    teamName: "Donegal Druids",
    country: "Ireland",
    league: "League of Ireland Premier Division",
    location: "Letterkenny",
    founded: 1930,
    stadium: "Errigal Park",
    titlesWon: 6,
    isActive: true,
    history: "Donegal Druids is a football team from Letterkenny. They were founded in 1930. They have won 6 league titles. They play at Errigal Park."
  }
];


export const players: Player[] = [
  {
    teamId: "1",  
    playerId: "1",
    name: "Liam O'Brien",
    position: "Goalkeeper",
    nationality: "Ireland",
    age: 30,
    isCaptain: false,
  },
  {
    teamId: "1",
    playerId: "2",
    name: "Conor McCarthy",
    position: "Defender",
    nationality: "Ireland",
    age: 27,
    isCaptain: true,
  },
  {
    teamId: "2",  
    playerId: "1",
    name: "Eoin Murphy",
    position: "Forward",
    nationality: "Ireland",
    age: 24,
    isCaptain: true,
  },
  {
    teamId: "2",
    playerId: "2",
    name: "Sean Doyle",
    position: "Midfielder",
    nationality: "Ireland",
    age: 25,
    isCaptain: false,
  },
  {
    teamId: "3",  
    playerId: "1",
    name: "Patrick Kelly",
    position: "Defender",
    nationality: "Ireland",
    age: 28,
    isCaptain: true,
  },
  {
    teamId: "3",
    playerId: "2",
    name: "Aiden Byrne",
    position: "Goalkeeper",
    nationality: "Ireland",
    age: 31,
    isCaptain: false,
  }
];