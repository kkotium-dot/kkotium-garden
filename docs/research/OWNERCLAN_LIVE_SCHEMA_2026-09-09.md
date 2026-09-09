# OwnerClan GraphQL Live Schema Snapshot

Fetched via introspection on 2026-09-09. 195 total types in schema.
This is the ACTUAL live schema (not the PDF manual) — use this to verify
field names before writing/changing any OwnerClan adapter code (#367).

## Key types actually used by this app's adapter

### Item (OBJECT)
```
  id: ID!
  key: String!
  createdAt: Timestamp!
  updatedAt: Timestamp!
  model: String
  production: String
  origin: String
  isUsed: String
  wholessalePrice: Int
  wholesale: String
  pricePolicy: PricePolicy!
  searchKeywords: [null!]!
  content: HTML!
  shippingFee: Int!
  shippingType: ShippingType!
  status: ItemStatus!
  options: [null!]!
  isPublic: Boolean!
  taxFree: Boolean!
  adultOnly: Boolean!
  returnable: Boolean!
  noReturnReason: String
  guaranteedShippingPeriod: Int
  openmarketSellable: Boolean!
  boxQuantity: Int
  attributes: [null!]!
  closingTime: String
  returnCriteria: ReturnCriteria!
  similarItems: [null!]!
  metadata: JSON
  name(lang: Language): String
  price(currency: Currency): Float
  fixedPrice(currency: Currency): Float
  images(size: ImageSize): [null!]!
  category: Category!
```

### ItemOption (OBJECT)
```
  key: String!
  quantity: Int!
  status: ItemOptionStatus!
  optionAttributes: [null!]!
  metadata: JSON
  price(currency: Currency): Float
  fixedPrice(currency: Currency): Float
```

### ItemOptionAttribute (OBJECT)
```
  name(lang: Language): String
  value(lang: Language): String
```

### ItemStatus (ENUM)
```

```

### ItemOptionStatus (ENUM)
```

```

### Order (OBJECT)
```
  id: ID!
  key: String!
  products: [null!]!
  status: OrderStatus!
  shippingInfo: ShippingInfo!
  createdAt: Timestamp!
  updatedAt: Timestamp!
  note: String
  ordererNote: String
  sellerNote: String
  isBeingMediated: Boolean!
  adjustments: [null!]!
  refundDetails: [null!]!
  transactions: [null!]!
```

### OrderProduct (OBJECT)
```
  key: String!
  quantity: Int!
  sourceAddress: Address
  shippingType: ShippingType!
  itemKey: String!
  productName: String
  itemOptionInfo: OrderProductItemOptionInfo
  trackingNumber: String
  shippingCompanyCode: String
  shippingCompanyName: String
  shippedDate: Timestamp
  additionalAttributes: [null!]!
  taxFree: Boolean!
  sellerNote: String
  price(currency: Currency): Float
```

### OrderStatus (ENUM)
```

```

### Query (OBJECT)
```
  category(lang: Language, key: ID!): Category
  allCategories(first: Int, last: Int, after: String, before: String): CategoriesConnection
  sellerQnaArticle(key: ID!): SellerQnaArticle!
  allSellerQnaArticles(first: Int, last: Int, after: String, before: String, search: SellerQnaSearch, type: SellerQnaType, receiverName: String, dateFrom: Timestamp, dateTo: Timestamp): SellerQnaArticlesConnection!
  vendorQnaArticle(key: String!): VendorQnaArticle!
  allVendorQnaArticles(first: Int, last: Int, after: String, before: String, search: VendorQnaSearch, dateFrom: Timestamp, dateTo: Timestamp, authorType: VendorQnaAuthorType, replied: Boolean, type: VendorQnaType): VendorQnaArticlesConnection!
  emergencyMessage(key: ID!): EmergencyMessage!
  allEmergencyMessages(first: Int, last: Int, after: String, before: String, status: EmergencyMessageStatus): EmergencyMessagesConnection!
  notice(key: String!): Notice!
  allNotices(first: Int, last: Int, after: String, before: String, type: NoticeType, authorType: NoticeAuthorType, checked: Boolean, search: NoticeSearch, dateFrom: Timestamp, dateTo: Timestamp): NoticesConnection!
  item(currency: Currency, lang: Language, key: ID!): Item!
  allItems(first: Int, last: Int, after: String, before: String, dateFrom: Timestamp, dateTo: Timestamp, minPrice: Int, maxPrice: Int, search: String, vendor: String, status: ItemStatus, category: String, attributes: [null!], vcode: String, vprdcode: String, shippingLocationType: ShippingLocationType, openmarketSellable: Boolean, grade: VendorGradeCode, sortBy: ItemSortCriteria, lang: Language, currency: Currency, isUsed: String): ItemsConnection!
  itemsByKeys(keys: [null]!): [null!]!
  itemHistories(first: Int, last: Int, after: String, before: String, dateFrom: Timestamp, dateTo: Timestamp, kind: ItemHistoryKind, itemKey: String): ItemHistoriesConnection!
  order(key: String!): Order
  allOrders(first: Int, last: Int, after: String, before: String, note: String, sellerNote: String, status: OrderStatus, dateFrom: Timestamp, dateTo: Timestamp, shippedAfter: Timestamp, shippedBefore: Timestamp): OrdersConnection!
  seller(key: ID!): Seller
  allSellers(first: Int, last: Int, after: String, before: String, sortBy: SellerSortCriteria, dateFrom: Timestamp, dateTo: Timestamp, confirmed: Boolean, signUpLocation: SignUpLocation, sellerConversion: Boolean, userType: UserType, grade: SellerGrade, requestedRemoval: Boolean, joinCourse: JoinCourse, manager: String, search: SellerSearch): SellersConnection
  sellerReceipt(issuedAt: Int, key: ID!): SellerReceipt
  allSellerReceipts(first: Int, last: Int, after: String, before: String, issuedFor: IssuedForSearch, corporateStatus: CorporateTaxType, taxFree: Boolean, issuanceStatus: Boolean, search: SellerReceiptSearch): SellerReceiptsConnection
  sellerReserve(key: String!): SellerReserve
  allSellersReserve(first: Int, last: Int, after: String, before: String, dateFrom: Timestamp, dateTo: Timestamp, search: SellerReserveSearch): SellerReservesConnection
  settlement(key: ID!): Settlement
  allSettlements(first: Int, last: Int, after: String, before: String, issuedFor: IssuedForSearch, status: SettlementStatus, period: SettlementPeriod, corporateTaxType: CorporateTaxType, search: SettlementSearch): SettlementsConnection!
  transaction(key: String!): Transaction
  user(key: ID!): User
  vendor(key: ID!): Vendor
  allVendors(first: Int, last: Int, after: String, before: String, dateFrom: Timestamp, dateTo: Timestamp, minAverageShippingDay: Float, maxAverageShippingDay: Float, minProductShippingRate: Float, maxProductShippingRate: Float, disabled: Boolean, search: VendorSearch): VendorsConnection
```

### Mutation (OBJECT)
```
  createSellerQnaArticle(input: SellerQnaArticleInput!): SellerQnaArticle!
  createSellerQnaArticleReply(input: SellerQnaArticleReplyInput!, key: ID!): SellerQnaArticle!
  createSellerQnaArticleComment(content: String!, key: ID!): SellerQnaArticle!
  createVendorQnaArticle(input: VendorQnaArticleInput!): VendorQnaArticle!
  createVendorQnaArticleReply(input: VendorQnaArticleReplyInput!, key: ID!): VendorQnaArticle!
  createEmergencyMessage(input: EmergencyMessageInput!): EmergencyMessage!
  createNotice(input: NoticeInput!): Notice!
  createItem(denyCautionWords: Boolean, autoReplace: Boolean, autoTranslate: Boolean, input: ItemInput!): Item
  updateItem(denyCautionWords: Boolean, autoReplace: Boolean, autoTranslate: Boolean, input: ItemUpdateInput!, key: ID!): Item
  discontinueItem(key: ID!): Boolean
  soldoutItem(key: ID!): Boolean
  resumeItem(key: ID!): Boolean
  createOrder(simulationResult: [null!], input: OrderInput!): [null!]!
  simulateCreateOrder(input: OrderInput!): [null!]!
  updateOrderNotes(input: OrderUpdateNotesInput!, key: ID!): Order!
  setTrackingInfo(input: TrackingInfoInput!, key: ID!): Order!
  setOrderProductsTrackingInfo(input: [null]!, key: ID!): Order!
  checkOrder(key: ID!): Order!
  cancelOrder(input: RequestOrderCancellationInput, requestOrderCancellation: Boolean, key: ID!): Order!
  requestOrderCancellation(input: RequestOrderCancellationInput!, key: ID!): Order!
  acceptOrderCancellationRequest(key: ID!): Order!
  rejectOrderCancellationRequest(input: RejectOrderCancellationInput!, key: ID!): Order!
  requestRefundOrExchange(input: RefundExchangeOrderInput!, key: ID!): Order!
```
