import { createArgument, createQuestion, createResolution, saveResponse } from './repo';

/** A small example bank so a new user can try the flow tools straight away. */
export async function loadSampleBank(): Promise<string> {
  const res = await createResolution('Sample: The US should ban single-use plastics', 'Example topic');
  const jobs = await createArgument(res.id, 'CON', 'Ban costs manufacturing jobs');
  const ocean = await createArgument(res.id, 'PRO', 'Plastic pollution harms oceans');

  await saveResponse({
    argumentId: jobs.id,
    kind: 'NU',
    isCard: true,
    tag: 'Plastics jobs already declining from automation',
    cite: 'Example 23, illustrative cite',
    text: 'Placeholder card text: replace this with your own evidence.',
    strength: 3,
  });
  await saveResponse({
    argumentId: jobs.id,
    kind: 'LINK_TURN',
    isCard: false,
    tag: 'Alternatives industry creates more jobs than it removes',
    text: 'Firms shift to paper, glass and reusables, which are more labor-intensive per unit.',
    strength: 2,
  });
  await saveResponse({
    argumentId: jobs.id,
    kind: 'WEIGHING',
    isCard: false,
    tag: 'Prefer our impact on scope: ocean harms are global and irreversible',
    text: '',
    strength: 2,
  });
  await saveResponse({
    argumentId: ocean.id,
    kind: 'MITIGATION',
    isCard: false,
    tag: 'Most ocean plastic comes from outside the US',
    text: 'Even a total US ban barely changes global ocean plastic.',
    strength: 3,
  });
  await createQuestion(jobs.id, 'How many of those jobs are already being automated away?');
  await createQuestion(jobs.id, 'Do companies making alternatives hire workers too?');
  await createQuestion(ocean.id, 'What share of ocean plastic comes from the US?');
  return res.id;
}
