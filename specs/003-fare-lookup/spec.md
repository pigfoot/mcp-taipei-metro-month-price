# Feature Specification: Taipei Metro Fare Lookup

**Feature Branch**: `003-fare-lookup`
**Created**: 2025-10-31
**Status**: Draft
**Input**: User description: "我想要處理臺北捷運系統票價
目前是要手動給票價  但我想要除了給票價之外  給定起訖站也可以去https://data.taipei/ 去下載臺北捷運系統票價, 然後自動取得票價"

## Clarifications

### Session 2025-10-31

- Q: 快取過期時間應該設定多久？ → A: 7 天（每週更新）
- Q: 站名匹配策略應該如何處理不完全相符的輸入？ → A: 模糊匹配加確認
- Q: 模糊匹配應該顯示多少個可能的選項？ → A: 前 3 個最相似的站名
- Q: 網路失敗時應該如何處理？ → A: 使用過期快取並警告使用者
- Q: 應該使用全票還是優惠票價？ → A: 預設全票票價，提供選項切換到優惠票價

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manual Fare Input (Priority: P1)

Users who already know their regular commute fare can directly input the fare amount to calculate their monthly pass savings, maintaining the existing quick workflow.

**Why this priority**: This preserves the existing functionality and ensures backward compatibility for users who prefer the current simple input method.

**Independent Test**: Can be fully tested by entering a known fare amount and verifying the monthly pass calculation proceeds correctly.

**Acceptance Scenarios**:

1. **Given** a user wants to calculate monthly pass savings, **When** they directly input a fare amount, **Then** the system proceeds with the monthly pass calculation using the provided fare
2. **Given** a user has entered a fare amount, **When** they request the calculation, **Then** the system displays the monthly pass savings analysis

---

### User Story 2 - Automatic Fare Lookup by Station Pair (Priority: P2)

Users who don't know the exact fare between stations can specify their origin and destination stations to have the system automatically retrieve the current fare from official data sources.

**Why this priority**: This adds significant value by eliminating the need for users to manually look up fares on external websites or apps, improving user experience.

**Independent Test**: Can be tested by providing origin and destination station names and verifying the correct fare is retrieved and used for calculation.

**Acceptance Scenarios**:

1. **Given** a user doesn't know the fare, **When** they provide origin and destination station names, **Then** the system retrieves the correct fare from the data source
2. **Given** valid station names are provided, **When** the fare is successfully retrieved, **Then** the system proceeds with the monthly pass calculation using the retrieved fare
3. **Given** a user enters station names, **When** the station names match multiple possibilities, **Then** the system presents up to 3 most similar options for disambiguation

---

### User Story 3 - Interactive Fare Input Choice (Priority: P3)

When users don't initially provide fare information, the system proactively asks whether they want to input the fare directly or specify stations for automatic lookup.

**Why this priority**: This provides a guided experience for new users who may not know all available options, improving discoverability.

**Independent Test**: Can be tested by not providing any fare information initially and verifying the system prompts for input method choice.

**Acceptance Scenarios**:

1. **Given** a user hasn't provided fare information, **When** they initiate a calculation, **Then** the system asks whether to input fare directly or use station lookup
2. **Given** the user chooses manual input, **When** they provide the fare, **Then** the system proceeds with calculation
3. **Given** the user chooses station lookup, **When** they provide station names, **Then** the system retrieves the fare and proceeds

### Edge Cases

- What happens when the fare data source is temporarily unavailable? System uses expired cache with warning if available, otherwise falls back to manual input
- How does the system handle station names that don't exist in the fare table?
- What happens when the cached fare data is corrupted or incomplete?
- How does the system handle special station names with similar spellings?
- What happens when network connectivity is lost during fare retrieval?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to input fare amounts directly for monthly pass calculations
- **FR-002**: System MUST provide option to retrieve fares by specifying origin and destination stations
- **FR-003**: System MUST download and parse fare data from the Taipei Open Data platform CSV source
- **FR-004**: System MUST handle Big5 encoding when processing the CSV fare data
- **FR-005**: System MUST cache fare data locally to minimize repeated downloads
- **FR-006**: System MUST automatically refresh cached data when it expires (after 7 days) or is missing
- **FR-007**: System MUST perform fuzzy matching on user-provided station names against the fare table's origin and destination columns
- **FR-008**: System MUST extract the regular fare amount from matched station pairs by default, with option for users to switch to discounted fare
- **FR-009**: System MUST prompt users for input method when no fare information is initially provided
- **FR-010**: System MUST handle network failures gracefully by using expired cache data when available and displaying a warning to users about potentially outdated information
- **FR-011**: System MUST present up to 3 most similar station name options when fuzzy matching is needed. The system returns suggestions in the response payload, and the user can then invoke the tool again with their selected station name to proceed with the fare lookup
- **FR-012**: System MUST maintain existing monthly pass calculation functionality after fare retrieval (Note: This requirement is satisfied by passing the retrieved fare to the existing calculation logic without modification to that logic)
- **FR-013**: System MUST provide an option for users to select between regular and discounted fare types via the `fareType` parameter (defaults to 'regular' if not specified)

### Key Entities *(include if feature involves data)*

- **Station Fare Record**: Represents a single fare entry between two stations, containing origin station name, destination station name, regular fare, discounted fare, and distance
- **Fare Cache**: Local storage of fare data with expiration tracking to minimize API calls
- **Station Pair**: User input consisting of origin and destination station names for fare lookup
- **Fare Lookup Request**: Input parameters for the MCP tool, supporting either direct fare input OR station-based lookup, with optional fare type selection (regular/discounted)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can obtain fare information and complete monthly pass calculation within 10 seconds
- **SC-002**: System successfully retrieves correct fares for 95% of valid station pair queries
- **SC-003**: Cached fare data reduces external API calls by at least 95% for repeat queries within the 7-day cache period
- **SC-004**: 90% of users successfully complete fare lookup on first attempt without requiring support
- **SC-005**: System handles fare data updates without service interruption or data loss
- **SC-006**: Interactive prompts reduce user confusion, achieving 85% task completion rate for new users

## Scope & Boundaries *(mandatory)*

### In Scope

- Retrieving fare data from Taipei Open Data platform
- Caching fare data with expiration management
- Station name to fare lookup functionality
- User interface for choosing input method (direct fare vs station lookup)
- Integration with existing monthly pass calculation logic

### Out of Scope

- Real-time fare updates or dynamic pricing
- Route planning or transfer suggestions
- Historical fare analysis or trends
- Integration with other transportation systems
- Mobile app development
- Multi-language station name support (only Chinese names as provided in the data source)

## Constraints & Assumptions *(mandatory)*

### Constraints

- Fare data must be retrieved from the specified Taipei Open Data API endpoint
- CSV data encoding is fixed as Big5
- System must work within existing application architecture
- Cache storage must not exceed reasonable local storage limits

### Assumptions

- The Taipei Open Data API structure and URL remain stable
- Station names in the CSV match commonly used station names
- Users know the correct station names or can recognize them from suggestions
- Internet connectivity is available for initial data download
- Fare structure remains consistent (regular and discounted fares)
- The CSV column structure (_id, 起站, 訖站, 全票票價, 優惠票價, 距離) remains unchanged

## Dependencies *(include if external dependencies exist)*

- **Taipei Open Data Platform**: Source of fare data via CSV endpoint
- **Network Connectivity**: Required for downloading fare data updates
- **Local Storage**: Required for caching fare data