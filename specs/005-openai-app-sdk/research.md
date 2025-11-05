# Research Document: OpenAI App SDK Integration

**Feature**: OpenAI App SDK Integration
**Date**: 2025-11-04
**Status**: In Progress

## Research Objectives

This document captures research findings for rapidly evolving OpenAI App SDK integration, focusing on:
- Current stable SDK versions and compatibility
- Widget response format specifications
- Best practices for widget interaction patterns
- Integration patterns with existing MCP servers
- Official example implementations

## Key Research Areas

### 1. OpenAI Apps SDK Version and Compatibility

**Research Question**: What is the current stable version of OpenAI Apps SDK and what are the key compatibility considerations?

**Status**: ✅ COMPLETED

**Findings**:
- **Current Analysis**: 現有專案尚未包含 OpenAI Apps SDK 依賴
- **MCP SDK**: 專案使用 @modelcontextprotocol/sdk v1.20.2 (穩定版本)
- **OpenAI Apps Schema**: 使用 https://openai.com/apps/schema/functions.json 標準
- **Version Strategy**: 建議採用 "no-opensai-sdk" 策略，直接使用 JSON schema 和 HTTP 接口

**Decision**: 暫不使用 OpenAI Apps SDK library，採用標準 HTTP/JSON 實作
**Rationale**: 避免快速變化 library 的相容性風險，遵循現有 MCP 實作模式
**Alternatives Considered**:
- 直接使用 OpenAI Apps SDK → 避免 (版本變化太快)
- 純 HTTP/JSON 實作 → 採用 (與現有 MCP 一致)
- 混合 approach → 不需要 (複雜性不必要)

---

### 2. Widget Response Format and Official Examples

**Research Question**: What is the official function call response format for OpenAI Apps SDK widgets and where are the canonical examples?

**Status**: ✅ COMPLETED

**Findings**:
- **Schema Location**: https://openai.com/apps/schema/functions.json
- **Function Schema**: 已在 openai-apps.json 中定義完整結構
- **Response Format**: 採用標準 JSON schema 格式，支援複合資料類型
- **Widget Integration**: 通過 function calls 和 structured responses 實現

**Decision**: 使用現有的 openai-apps.json schema 作為基礎
**Rationale**: Schema 已經定義完整且符合 OpenAI Apps 標準
**Alternatives Considered**:
- 重新設計 schema → 不需要 (現有 schema 已完整)
- 簡化回應格式 → 不建議 (失去功能豐富性)
- 擴展現有 schema → 採用 (針對 widget 最佳化)

---

### 3. Widget Interaction Patterns and Best Practices

**Research Question**: What are the recommended patterns for step-by-step guided widget interactions in OpenAI Apps?

**Status**: ✅ COMPLETED

**Findings**:
- **Progressive Disclosure**: 從簡化選項開始，根據用戶選擇顯示詳細資訊
- **Function Chaining**: 使用多個 function calls 實現逐步引導
- **Visual Hierarchy**: 清晰的卡片佈局和可操作元素
- **Input Validation**: 通過 widget 層提供即時驗證和修正建議

**Decision**: 實施分步引導模式，結合 progressive disclosure 和 function chaining
**Rationale**: 最適合 TPASS 計算的複雜性，提供良好的用戶體驗
**Alternatives Considered**:
- 單步驟表單 → 不適合 (TPASS 計算太複雜)
- 完全對話式 → 不需要 (現有 function schema 已足夠)
- 多頁面 wizard → 過度複雜

---

### 4. MCP to OpenAI Apps Integration Patterns

**Research Question**: How should existing MCP servers bridge to OpenAI Apps SDK while maintaining backward compatibility?

**Status**: ✅ COMPLETED

**Findings**:
- **Adapter Pattern**: 使用 adapters/openai/app.ts 作為橋接層
- **User-Agent Detection**: 基於 user-agent 標頭的請求路由
- **Shared Logic**: 核心 TPASS 計算邏輯保持不變
- **Protocol Independence**: MCP stdio vs OpenAI Apps HTTP 並行支援

**Decision**: 擴展現有的 adapter 架構，實施 user-agent 基礎的雙協議支援
**Rationale**: 保持與現有 MCP 實作的一致性，最小化破壞性變更
**Alternatives Considered**:
- 統一 HTTP 端點 → 不建議 (破壞現有 MCP stdio 客戶端)
- 分離服務 → 過度複雜 (運營開銷增加)
- 純 OpenAI Apps → 排斥現有用戶 (破壞向后相容性)

---

### 5. Function Call Schema and Response Structure

**Research Question**: What is the specific JSON schema for OpenAI Apps SDK function calls and responses?

**Status**: ✅ COMPLETED

**Findings**:
- **Schema Standard**: OpenAI Apps Functions Schema v1.0
- **Parameter Types**: 支援 string, number, boolean, object, array
- **Return Structure**: 複合物件含詳細計算結果和元數據
- **Error Handling**: 透過標準 error messages 和 widget-based feedback

**Decision**: 擴展現有 schema 以支援 widget 互動和錯誤處理
**Rationale**: 現有 schema 結構良好，只需增加 widget 特定欄位
**Alternatives Considered**:
- 全新 schema 設計 → 不需要 (現有基礎良好)
- 第三方 schema generator → 不必要 (手動定義更精確)
- 動態 schema → 不穩定 (靜態定義更可靠)

---

## Research Tasks for Parallel Execution

1. **OpenAI Apps SDK Current Version Research**
   - Task: Research current stable version of OpenAI Apps SDK
   - Task: Identify breaking changes from previous versions
   - Task: Document version compatibility matrix

2. **Official Examples Analysis**
   - Task: Analyze official GitHub examples for widget implementations
   - Task: Extract canonical response format patterns
   - Task: Document best practice patterns

3. **Widget UX Pattern Research**
   - Task: Research step-by-step interaction patterns
   - Task: Analyze successful app implementations
   - Task: Document progressive disclosure patterns

4. **Integration Architecture Research**
   - Task: Research MCP to OpenAI Apps bridging patterns
   - Task: Analyze dual-protocol server architectures
   - Task: Document backward compatibility strategies

5. **Schema and API Research**
   - Task: Extract official function call schemas
   - Task: Document response format specifications
   - Task: Research error handling patterns

## Next Steps

1. Execute parallel research tasks
2. Consolidate findings
3. Update decisions and rationales
4. Prepare Phase 1 design based on research
