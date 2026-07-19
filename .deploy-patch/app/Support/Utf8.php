<?php

namespace App\Support;

class Utf8
{
    /**
     * Recursively coerce values to valid UTF-8 for JSON storage.
     */
    public static function sanitize(mixed $value): mixed
    {
        if (is_string($value)) {
            return self::string($value);
        }

        if (is_array($value)) {
            $clean = [];
            foreach ($value as $key => $item) {
                $cleanKey = is_string($key) ? self::string($key) : $key;
                $clean[$cleanKey] = self::sanitize($item);
            }

            return $clean;
        }

        return $value;
    }

    public static function string(?string $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }

        // Fast path: already valid UTF-8
        if (mb_check_encoding($value, 'UTF-8')) {
            $clean = @iconv('UTF-8', 'UTF-8//IGNORE', $value);

            return is_string($clean) ? $clean : $value;
        }

        foreach (self::candidateEncodings() as $encoding) {
            $converted = @mb_convert_encoding($value, 'UTF-8', $encoding);
            if (! is_string($converted) || $converted === '') {
                continue;
            }

            if (mb_check_encoding($converted, 'UTF-8')) {
                $clean = @iconv('UTF-8', 'UTF-8//IGNORE', $converted);

                return is_string($clean) ? $clean : $converted;
            }
        }

        // Drop invalid bytes
        $clean = @iconv('UTF-8', 'UTF-8//IGNORE', $value);
        if (is_string($clean)) {
            return $clean;
        }

        // Last resort: strip non-printable / non-UTF8 safely
        return preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $value) ?? '';
    }

    /**
     * @return list<string>
     */
    private static function candidateEncodings(): array
    {
        $preferred = ['UTF-8', 'Windows-1256', 'ISO-8859-1', 'ISO-8859-6', 'Windows-1252', 'ASCII'];
        $available = array_map('strtoupper', mb_list_encodings());

        $list = [];
        foreach ($preferred as $encoding) {
            if (in_array(strtoupper($encoding), $available, true)) {
                $list[] = $encoding;
            }
        }

        return $list !== [] ? $list : ['UTF-8', 'ISO-8859-1', 'ASCII'];
    }
}
