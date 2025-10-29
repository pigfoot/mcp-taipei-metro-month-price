/**
 * OpenAI Apps function schemas
 * Based on contracts/openai-apps.json
 */

/**
 * OpenAI function schema for calculateTPASSComparison
 */
export const calculateTPASSComparisonSchema = {
  name: 'calculateTPASSComparison',
  description:
    'Calculate and compare TPASS monthly pass (NT$1,200 for 30 days) versus Taipei Metro regular fare with frequent rider discount (5%-15% based on trip count)',
  parameters: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description:
          "Start date for TPASS validity period in YYYY-MM-DD format. If not provided, uses today's date.",
      },
      oneWayFare: {
        type: 'number',
        description:
          'One-way fare amount in New Taiwan Dollars (NTD). Default is 40 NTD if not specified.',
      },
      tripsPerDay: {
        type: 'number',
        description:
          'Number of trips per working day. Default is 2 (round trip) if not specified.',
      },
      customWorkingDays: {
        type: 'number',
        description: 'Optional: Override the calculated working days with a custom value (0-30).',
      },
    },
  },
};

/**
 * OpenAI function schema for getDiscountInformation
 */
export const getDiscountInformationSchema = {
  name: 'getDiscountInformation',
  description:
    'Get detailed information about Taipei Metro frequent rider discount program and TPASS benefits',
  parameters: {
    type: 'object',
    properties: {},
  },
};

/**
 * All OpenAI function schemas
 */
export const openAIFunctionSchemas = [
  calculateTPASSComparisonSchema,
  getDiscountInformationSchema,
];
