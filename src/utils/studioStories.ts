export function studioStories(teams: string[], players: string[]): string[] {
  const team = (index: number) => teams[index % teams.length] || 'Your franchise';
  const player = (index: number) => players[index % players.length] || 'your WR1';
  return [
    `ETSY WITCHES report a 400% surge in hex requests after ${team(0)} names ${player(0)} a starter. Shipping delays may affect Sunday curses.`,
    `UN HUMAN RIGHTS OBSERVERS dispatched to ${team(1)}'s bench. “Nobody should have to watch that many unused points.”`,
    `CERN opens investigation after ${team(2)} proposes a trade that violates three laws of thermodynamics and basic decency.`,
    `VATICAN receives emergency petition from ${team(0)}. ${player(1)} remains listed as “questionable; divine intervention pending.”`,
    `NASA confirms ${team(1)}'s projected ceiling is visible from orbit. Actual floor remains somewhere beneath the Earth's crust.`,
    `LOCAL COMMISSIONER asks ${team(2)} to stop calling the waiver wire “quantitative easing.” Treasury declines to comment.`,
    `MUSEUM OF MODERN ART acquires ${team(0)}'s lineup as a study in avoidable suffering. ${player(2)} requests anonymity.`,
    `LABOUR TRIBUNAL hears ${player(3)}'s appeal against carrying ${team(1)} for another week. Management offers exposure.`,
    `NOBEL COMMITTEE withdraws mathematics nomination from ${team(2)} after review of their “basically a guaranteed win” calculation.`,
    `MET OFFICE issues a severe cope warning for ${team(0)} versus ${team(1)}. Expect scattered excuses and heavy Monday-night rationalisation.`,
  ];
}
