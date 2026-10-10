export function gradeSummary(grades) {
  const weight = grades.reduce((s, g) => s + g.weight, 0);
  const graded = grades.filter((g) => g.score !== "" && g.score != null);
  const assessed = graded.reduce((s, g) => s + g.weight, 0);
  const weighted = graded.reduce((s, g) => s + (g.score * g.weight) / 100, 0);
  return {
    weight,
    assessed,
    weighted,
    average: assessed ? (weighted * 100) / assessed : null,
    complete: Math.abs(weight - 100) < 0.001 && assessed === weight,
  };
}
