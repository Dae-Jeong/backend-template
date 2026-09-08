package com.example.backendtemplate.exceptions;

/** Signals a concurrent winner; the failed transaction must end before replay. */
public class IdempotencyClaimed extends RuntimeException {}
