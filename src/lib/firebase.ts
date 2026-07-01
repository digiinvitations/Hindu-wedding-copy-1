// Mock Firebase - All active services removed. Running 100% Client-Side.
export const db = {} as any;

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error("Firestore Error Mock: ", error);
}
