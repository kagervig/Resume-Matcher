import * as React from 'react';
import { Input, type InputProps } from '@/components/ui/input';

export interface AutocompleteInputProps extends InputProps {
  /** Suggestion values offered in the native dropdown. Free text is still allowed. */
  suggestions: string[];
}

/**
 * Text input backed by a native `<datalist>`. The datalist only offers completions —
 * the user can always type a value that is not in the list. Suggestions are supplied
 * by the caller (e.g. the user's own past companies/titles).
 */
const AutocompleteInput = React.forwardRef<HTMLInputElement, AutocompleteInputProps>(
  ({ suggestions, id, ...props }, ref) => {
    const generatedId = React.useId();
    const listId = `${id ?? generatedId}-suggestions`;
    return (
      <>
        <Input ref={ref} id={id} list={listId} {...props} />
        <datalist id={listId}>
          {suggestions.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      </>
    );
  }
);
AutocompleteInput.displayName = 'AutocompleteInput';

export { AutocompleteInput };
