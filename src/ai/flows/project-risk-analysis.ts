

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input Schema
export const ProjectRiskAnalysisInputSchema = z.object({
    title: z.string(),
    description: z.string(),
    budget: z.union([z.string(), z.number()]).transform(val => String(val)),
    duration: z.string(),
    milestones: z.string().optional().describe("List of milestones or 'None'"),
});

export type ProjectRiskAnalysisInput = z.infer<typeof ProjectRiskAnalysisInputSchema>;

// Output Schema
export const ProjectRiskAnalysisOutputSchema = z.object({
    risk_level: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    risk_summary: z.string(),
    issues: z.array(z.string()),
    confidence_score: z.number(),
});

export type ProjectRiskAnalysisOutput = z.infer<typeof ProjectRiskAnalysisOutputSchema>;

// Define Prompt
const riskAnalysisPrompt = ai.definePrompt({
    name: 'projectRiskAnalysisPrompt',
    input: { schema: ProjectRiskAnalysisInputSchema },
    output: { schema: ProjectRiskAnalysisOutputSchema },
    prompt: `You are an AI assistant analyzing freelance projects for potential risk.

Analyze the following project objectively and neutrally.

Project Title:
{{title}}

Project Description:
{{description}}

Budget:
{{budget}}

Expected Duration:
{{duration}}

Milestones:
{{milestones}}

Your task:
1. Identify if the scope is vague or unclear
2. Identify if the duration is unrealistic for the scope
3. Identify if the budget is too low or too high for similar work
4. Identify missing or ambiguous milestone definitions
5. Estimate the likelihood of future disputes

Respond ONLY in valid JSON using the following structure:
{
  "risk_level": "LOW" | "MEDIUM" | "HIGH",
  "risk_summary": "short clear explanation",
  "issues": [
    "issue 1",
    "issue 2"
  ],
  "confidence_score": number (0-100)
}

Do NOT provide advice, do NOT mention legal terms, do NOT add extra text.`,
});

// Define Flow
export const projectRiskAnalysisFlow = ai.defineFlow(
    {
        name: 'projectRiskAnalysisFlow',
        inputSchema: ProjectRiskAnalysisInputSchema,
        outputSchema: ProjectRiskAnalysisOutputSchema,
    },
    async (input) => {
        const { output } = await riskAnalysisPrompt(input);
        if (!output) {
            throw new Error('Failed to generate risk analysis');
        }
        return output;
    }
);
