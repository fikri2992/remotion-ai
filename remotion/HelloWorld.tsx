import React from 'react';
import { z } from 'zod';

export const helloWorldCompSchema = z.object({
  titleText: z.string().default('Hello, world!'),
  titleColor: z.string().optional(),
  logoColor1: z.string().optional(),
  logoColor2: z.string().optional(),
});

export type HelloWorldProps = z.infer<typeof helloWorldCompSchema>;

export const HelloWorld: React.FC<HelloWorldProps> = ({ titleText, titleColor = '#000000' }) => {
  return (
    <div style={{
      flex: 1,
      background: '#ffffff',
      height: '100%',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, system-ui, Arial',
      fontSize: 80,
      color: titleColor,
    }}>
      {titleText}
    </div>
  );
};
