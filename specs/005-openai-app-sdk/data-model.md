# Data Model: OpenAI App SDK Integration

**Feature**: OpenAI App SDK Integration
**Date**: 2025-11-04
**Version**: 1.0.0

## Overview

This document defines the data entities and relationships for OpenAI App SDK integration with TPASS calculator service. The model extends existing MCP data structures to support widget-based interactions while maintaining backward compatibility.

## Core Entities

### 1. UserAgentDetection

**Purpose**: Determine client protocol type from HTTP request metadata

**Fields**:
- `userAgent: string` - Raw User-Agent header value
- `isOpenAI: boolean` - True if contains "openai-mcp" prefix
- `openAIVersion?: string` - Extracted version from User-Agent (e.g., "1.0.0")
- `clientType: "mcp" | "openai-apps"` - Determined client protocol

**Validation Rules**:
- Must contain valid User-Agent header or default to MCP
- Must correctly identify OpenAI Apps clients
- Version extraction must be robust against malformed headers

---

### 2. ResponseFormatter

**Purpose**: Generate appropriate response format based on client type

**Fields**:
- `clientType: "mcp" | "openai-apps"` - Target response format
- `responseData: any` - Calculation results to format
- `widgetConfig?: WidgetConfiguration` - OpenAI Apps widget specifications
- `formattedResponse: any` - Final formatted response

**Validation Rules**:
- Must handle both MCP JSON-RPC and OpenAI Apps formats
- Must preserve all calculation accuracy
- Must generate valid widget configurations

---

### 3. WidgetConfiguration

**Purpose**: Define OpenAI Apps widget structure for user interaction

**Fields**:
- `type: "form" | "result" | "error"` - Widget interaction type
- `title: string` - Human-readable widget title
- `description?: string` - Additional context or instructions
- `fields?: WidgetField[]` - Input fields for form widgets
- `actions?: WidgetAction[]` - Interactive elements (buttons, links)
- `layout: "vertical" | "horizontal" | "grid"` - Visual arrangement

**WidgetField Types**:
- `date-picker`: Date input with validation
- `number-input`: Numeric input with min/max validation
- `dropdown`: Select from predefined options
- `text-input`: Free-form text input
- `checkbox`: Boolean selection

**Validation Rules**:
- Form widgets must have appropriate field types
- Required fields must be marked
- Validation rules must match backend constraints
- Layout must be compatible with ChatGPT rendering

---

### 4. FunctionCall

**Purpose**: Handle OpenAI Apps function call requests and responses

**Fields**:
- `name: string` - Function name (e.g., "calculateTPASSComparison")
- `parameters: Record<string, any>` - Function parameters
- `result?: FunctionResult` - Computed result
- `error?: FunctionError` - Error information if call fails

**Validation Rules**:
- Parameters must match function schema
- Result must conform to return type specification
- Errors must provide actionable guidance

---

### 5. FunctionResult

**Purpose**: Structured response for OpenAI Apps function calls

**Fields**:
- `success: boolean` - Whether calculation completed successfully
- `data?: TpassCalculation` - Calculation result data
- `widget?: WidgetConfiguration` - Widget for result display
- `recommendation: "BUY_TPASS" | "USE_REGULAR"` - Cost-based recommendation
- `metadata?: CalculationMetadata` - Additional calculation context

**Validation Rules**:
- Success field must accurately reflect operation status
- Widget configuration must be valid for result type
- Recommendation must be based on actual calculation

---

### 6. StepByStepInteraction

**Purpose**: Manage progressive disclosure and guided user flows

**Fields**:
- `currentStep: number` - Current step in interaction flow
- `totalSteps: number` - Total steps in the flow
- `stepTitle: string` - Title for current step
- `stepDescription?: string` - Detailed explanation for current step
- `nextStepConfig?: WidgetConfiguration` - Widget for next step
- `canProceed: boolean` - Whether user can advance to next step

**Interaction Patterns**:
- **Step 1**: Basic parameters (start date, fare amount)
- **Step 2**: Advanced options (trips per day, custom working days)
- **Step 3**: Result display with savings visualization
- **Step 4**: Optional: Cross-month details and breakdown

**Validation Rules**:
- Step progression must be logical and intuitive
- Each step must validate inputs before allowing progression
- Final step must provide complete calculation results

---

## Entity Relationships

```
UserAgentDetection ──→ ResponseFormatter
ResponseFormatter ──→ WidgetConfiguration
FunctionCall ──→ FunctionResult
FunctionResult ──→ WidgetConfiguration
StepByStepInteraction ──→ WidgetConfiguration
```

## Data Flow

1. **Request Reception**: HTTP request → UserAgentDetection
2. **Protocol Routing**: UserAgentDetection → ResponseFormatter
3. **Function Processing**: FunctionCall → Core Calculation Logic → FunctionResult
4. **Response Formatting**: FunctionResult + WidgetConfiguration → Formatted Response
5. **Client Delivery**: Response sent to appropriate client protocol

## State Transitions

### UserAgentDetection State Machine
```
Unknown → Detecting → OpenAI Apps Detected
             ↓
        MCP Client Detected
```

### StepByStepInteraction Flow
```
Step 1 (Basic) → [Validate] → Step 2 (Advanced) → [Validate] → Step 3 (Results) → [Validate] → Complete
```

## Validation Rules Summary

| Entity | Rule | Severity |
|--------|------|----------|
| UserAgentDetection | Default to MCP if User-Agent missing | Error |
| WidgetConfiguration | Must have valid type and layout | Error |
| FunctionCall | Parameters must match schema | Error |
| FunctionResult | Success flag must be accurate | Error |
| StepByStepInteraction | Steps must be sequentially accessible | Error |

## Error Handling Model

### Error Types
- **ValidationError**: Input data doesn't meet requirements
- **CalculationError**: TPASS calculation failed
- **WidgetError**: Widget configuration invalid
- **ProtocolError**: Protocol-specific error

### Error Response Format
```json
{
  "success": false,
  "error": {
    "type": "ValidationError",
    "message": "Description of the error",
    "widget": {
      "type": "error",
      "title": "Please correct your input",
      "actions": [
        {"type": "retry", "label": "Try again"}
      ]
    }
  }
}
```

## Version Compatibility

- **Schema Version**: 1.0.0
- **OpenAI Apps Schema**: Functions v1.0
- **MCP Protocol**: Compatible with MCP v1.0
- **Backward Compatibility**: Maintained for all existing MCP clients

## Security Considerations

- No additional authentication required (consistent with MCP)
- Input validation prevents injection attacks
- Widget responses sanitized for safe rendering
- User-Agent detection immune to spoofing (defaults safely)
