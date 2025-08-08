import React from 'react';
import { ArrayViz, ArrayVizProps } from './ArrayViz';

export interface StringVizProps extends Omit<ArrayVizProps<string>, 'values'> {
  s: string;
}

export const StringViz: React.FC<StringVizProps> = ({ s, ...rest }) => {
  const values = Array.from(s);
  return <ArrayViz values={values} {...rest} />;
};
