declare namespace google {
  namespace accounts {
    namespace id {
      function initialize(config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
        auto_select?: boolean;
      }): void;
      function prompt(): void;
      function renderButton(parent: HTMLElement, options: {
        theme?: string;
        size?: string;
        width?: number;
        text?: string;
        shape?: string;
      }): void;
    }
  }
}
