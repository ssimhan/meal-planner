export interface WorkflowStatus {
    week_of: string;
    state: string;
    has_data: boolean;
    status: string;
    message?: string;
}

export async function getStatus(): Promise<WorkflowStatus> {
    const res = await fetch('/api/status');
    if (!res.ok) {
        throw new Error('Failed to fetch status');
    }
    return res.json();
}

export async function generatePlan(week_of: string): Promise<any> {
    const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ week_of }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to generate plan');
    }
    return res.json();
}
