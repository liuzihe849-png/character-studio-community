"""Declarative raster-poster animation, preserving approved artwork pixels."""
from poster_layers import validate_layers

def validate_raster(cfg):
 if cfg.get('renderer')!='raster-poster' or (cfg.get('width'),cfg.get('height')) not in [(720,1080),(720,1280)]:raise ValueError('Raster posters require 720x1280')
 if cfg.get('fps') not in [25,30] or cfg.get('loopSeconds')!=6:raise ValueError('Raster posters require a six-second cycle at 25 or 30fps')
 layers=validate_layers(cfg.get('layers'),raster=True)
 if not any(l['type'] in ['image','relief','phosphor'] for l in layers):raise ValueError('Raster posters need at least one image layer')
 return layers
