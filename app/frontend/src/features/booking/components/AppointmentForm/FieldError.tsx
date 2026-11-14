interface FieldErrorProps {
  id: string;
  message?: string;
}

export function FieldError({ id, message }: FieldErrorProps) {
  return message ? (
    <span id={id} className="text-red-700">
      {message}
    </span>
  ) : null;
}
