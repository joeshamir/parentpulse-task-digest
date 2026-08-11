/**
 * Server-only helper that calls Railway's GraphQL API to restart (redeploy)
 * the ParentPulse worker service. Never import this from client code.
 */

const RAILWAY_API_URL = 'https://backboard.railway.app/graphql/v2';

interface RestartResult {
  success: boolean;
  message: string;
}

/**
 * Trigger a redeploy of a Railway service in a specific environment.
 * Requires a Railway account API token with permission to manage the project.
 */
export async function restartRailwayService(options: {
  apiToken: string;
  serviceId: string;
  environmentId: string;
}): Promise<RestartResult> {
  const { apiToken, serviceId, environmentId } = options;

  const query = `
    mutation ServiceInstanceRedeploy($serviceId: String!, $environmentId: String!) {
      serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
    }
  `;

  try {
    const response = await fetch(RAILWAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        query,
        variables: { serviceId, environmentId },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        success: false,
        message: `Railway returned HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`,
      };
    }

    const body = (await response.json()) as {
      errors?: Array<{ message: string }>;
      data?: { serviceInstanceRedeploy?: boolean | null };
    };

    if (body.errors?.length) {
      return {
        success: false,
        message: body.errors.map((e) => e.message).join('; '),
      };
    }

    if (body.data?.serviceInstanceRedeploy !== true) {
      return {
        success: false,
        message: 'Railway did not confirm the restart. Check the service ID and environment ID.',
      };
    }

    return {
      success: true,
      message: 'Restart requested. The worker should be back online within 30–60 seconds.',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error calling Railway',
    };
  }
}
